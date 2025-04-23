import functools
import inspect

def debug_args_retval(func):
    """Decorator to print function arguments and return value."""
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        # Get argument names and values
        sig = inspect.signature(func)
        bound_args = sig.bind(*args, **kwargs)
        bound_args.apply_defaults()
        
        arg_strs = []
        for name, value in bound_args.arguments.items():
            arg_strs.append(f"{name}={repr(value)}")
            
        print(f"Calling: {func.__name__}({', '.join(arg_strs)})")
        
        try:
            result = func(*args, **kwargs)
            print(f"Returning from {func.__name__}: {repr(result)}")
            return result
        except Exception as e:
            print(f"Exception in {func.__name__}: {e}")
            raise # Re-raise the exception after printing
            
    return wrapper